import { Client } from '@elastic/elasticsearch';
import { ENV } from './env.js';

let esClient: Client | null = null;

export function getElasticsearchClient(): Client {
  if (!esClient) {
    const options: any = {
      node: ENV.ELASTICSEARCH_NODE,
      tls: {
        rejectUnauthorized: false, // Useful for self-signed certificates in dev or cloud
      },
    };

    if (ENV.ELASTICSEARCH_API_KEY) {
      options.auth = {
        apiKey: ENV.ELASTICSEARCH_API_KEY,
      };
    }

    esClient = new Client(options);
  }
  return esClient;
}

export default getElasticsearchClient;
