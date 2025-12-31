import { Injectable } from '@nestjs/common';
import { SojebStorage } from './common/lib/Disk/SojebStorage';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AppService {
  getHello(): string {
    const templatePath = path.join(process.cwd(), 'src', 'mail', 'templates', 'hello.html');
    const template = fs.readFileSync(templatePath, 'utf-8');
    return template;
  }

  async test(image: Express.Multer.File) {
    try {
      const fileName = image.originalname;
      const fileType = image.mimetype;
      const fileSize = image.size;
      const fileBuffer = image.buffer;

      const result = await SojebStorage.put(fileName, fileBuffer);

      return {
        success: true,
        message: 'Image uploaded successfully',
        data: result,
        url: SojebStorage.url('tony1.jpg'),
      };
    } catch (error) {
      throw new Error(`Failed to upload image: ${error}`);
    }
  }
}
