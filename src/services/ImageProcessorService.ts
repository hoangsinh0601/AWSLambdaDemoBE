import { logger } from "../utils/logger";

export class ImageProcessorService {
  async processPlaceholderImage(key: string): Promise<void> {
    logger.info("Image processor placeholder invoked", { key });
  }
}
