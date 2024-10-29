import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLD_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLD_API_KEY'),
      api_secret: this.configService.get<string>('CLD_API_SECRET'),
    });
  }
  async generateSignature(
    publicId: string,
    folder: string,
  ): Promise<{ signature: string; timestamp: number }> {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp,
        public_id: publicId,
        folder,
      },
      process.env.CLD_API_SECRET,
    );
    return { signature, timestamp };
  }

  async deleteFilesFromCloudinary(publicIds: string[]) {
    try {
      const deletionPromises = publicIds.map(
        (publicId) =>
          new Promise((resolve, reject) => {
            const fullPublicId = `chat/${publicId}`; // 'post' klasörünü ekleyin
            cloudinary.uploader.destroy(
              fullPublicId,
              { invalidate: true },
              (error, result) => {
                if (error) {
                  console.error(
                    `Error deleting file with publicId ${publicId}:`,
                    error,
                  );
                  reject(error);
                } else {
                  console.log(
                    `Result of deleting file with publicId ${publicId}:`,
                    result,
                  );
                  resolve(result);
                }
              },
            );
          }),
      );

      await Promise.all(deletionPromises);
      console.log('Files successfully deleted from Cloudinary', publicIds);
    } catch (error) {
      console.error('Failed to delete files from Cloudinary:', error);
    }
  }
}
