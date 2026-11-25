import getElasticsearchClient from '../config/elasticsearch.js';
import prisma from '../config/db.js';

export const EMAILS_INDEX_NAME = 'reachinbox-emails';

export interface IndexedEmailDoc {
  id: string;
  userId: string;
  senderId: string;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  bodyText: string;
  status: string;
  scheduledAt: string;
  sentAt?: string | null;
  rescheduledCount?: number;
  etherealUrl?: string | null;
  errorMessage?: string | null;
}

export class ElasticsearchService {
  private static isInitialized = false;

  /**
   * Creates the Elasticsearch index and mappings if it doesn't already exist
   */
  static async ensureIndex(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const client = getElasticsearchClient();
      const exists = await client.indices.exists({ index: EMAILS_INDEX_NAME });

      if (!exists) {
        await client.indices.create({
          index: EMAILS_INDEX_NAME,
          mappings: {
            properties: {
              id: { type: 'keyword' },
              userId: { type: 'keyword' },
              senderId: { type: 'keyword' },
              senderEmail: { type: 'keyword' },
              recipientEmail: {
                type: 'text',
                fields: {
                  keyword: { type: 'keyword' },
                },
              },
              subject: { type: 'text' },
              bodyText: { type: 'text' },
              status: { type: 'keyword' },
              scheduledAt: { type: 'date' },
              sentAt: { type: 'date' },
              rescheduledCount: { type: 'integer' },
              etherealUrl: { type: 'keyword' },
              errorMessage: { type: 'text' },
            },
          },
        });
        console.log(`🔍 Elasticsearch index '${EMAILS_INDEX_NAME}' created successfully.`);
      }

      this.isInitialized = true;
    } catch (err: any) {
      console.warn('⚠️ Elasticsearch indexing setup notice:', err.message);
    }
  }

  /**
   * Indexes a newly created email record
   */
  static async indexEmail(doc: IndexedEmailDoc): Promise<void> {
    try {
      await this.ensureIndex();
      const client = getElasticsearchClient();

      await client.index({
        index: EMAILS_INDEX_NAME,
        id: doc.id,
        document: doc,
        refresh: 'wait_for',
      });
    } catch (err: any) {
      console.warn(`[Elasticsearch] Failed to index document ${doc.id}:`, err.message);
    }
  }

  /**
   * Partially updates an existing email record in Elasticsearch
   */
  static async updateEmailStatus(
    id: string,
    updateData: Partial<IndexedEmailDoc>
  ): Promise<void> {
    try {
      const client = getElasticsearchClient();
      await client.update({
        index: EMAILS_INDEX_NAME,
        id,
        doc: updateData,
        doc_as_upsert: true,
        refresh: 'wait_for',
      });
    } catch (err: any) {
      console.warn(`[Elasticsearch] Failed to update document ${id}:`, err.message);
    }
  }

  /**
   * Full-text search with multi-match and fuzzy query across recipient, subject, and body
   */
  static async searchEmails(
    userId: string,
    queryText?: string,
    statusFilter?: string
  ): Promise<{ hits: any[]; source: 'elasticsearch' | 'database' }> {
    try {
      const client = getElasticsearchClient();
      const mustClauses: any[] = [{ term: { userId } }];

      if (statusFilter) {
        mustClauses.push({ term: { status: statusFilter } });
      }

      let searchQuery: any = {
        bool: {
          must: mustClauses,
        },
      };

      if (queryText && queryText.trim()) {
        searchQuery.bool.should = [
          {
            multi_match: {
              query: queryText.trim(),
              fields: ['recipientEmail^3', 'subject^2', 'bodyText'],
              fuzziness: 'AUTO',
            },
          },
          {
            wildcard: {
              recipientEmail: `*${queryText.trim().toLowerCase()}*`,
            },
          },
        ];
        searchQuery.bool.minimum_should_match = 1;
      }

      const response = await client.search({
        index: EMAILS_INDEX_NAME,
        query: searchQuery,
        sort: [{ scheduledAt: { order: 'desc' } }],
        size: 100,
      });

      const hits = response.hits.hits.map((h: any) => h._source);
      return { hits, source: 'elasticsearch' };
    } catch (err: any) {
      console.warn('[Elasticsearch] Search query failed, falling back to database search:', err.message);

      // Resilient fallback to PostgreSQL full-text search
      const whereClause: any = { userId };
      if (statusFilter) {
        whereClause.status = statusFilter;
      }
      if (queryText && queryText.trim()) {
        whereClause.OR = [
          { recipientEmail: { contains: queryText.trim(), mode: 'insensitive' } },
          { subject: { contains: queryText.trim(), mode: 'insensitive' } },
          { bodyText: { contains: queryText.trim(), mode: 'insensitive' } },
        ];
      }

      const results = await prisma.emailJob.findMany({
        where: whereClause,
        include: { sender: { select: { email: true, name: true } } },
        orderBy: { scheduledAt: 'desc' },
        take: 100,
      });

      return {
        hits: results.map((r) => ({
          id: r.id,
          userId: r.userId,
          senderId: r.senderId,
          senderEmail: r.sender?.email,
          recipientEmail: r.recipientEmail,
          subject: r.subject,
          bodyText: r.bodyText,
          status: r.status,
          scheduledAt: r.scheduledAt.toISOString(),
          sentAt: r.sentAt ? r.sentAt.toISOString() : null,
          rescheduledCount: r.rescheduledCount,
          etherealUrl: r.etherealUrl,
          errorMessage: r.errorMessage,
        })),
        source: 'database',
      };
    }
  }
}
