import { HttpService } from '@nestjs/axios';
import { HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { v2 as cloudinary } from 'cloudinary';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class VideoSdkService {
  private readonly apiKey: string = process.env.VIDEOSDK_API_KEY;
  private readonly apiEndPoint: string = process.env.VIDEOSDK_API_ENDPOINT;

  constructor(
    private readonly jwtService: JwtService,
    private readonly httpService: HttpService,
  ) {}

  generateToken(roomId?: string, peerId?: string): string {
    let payload: any = {
      apikey: this.apiKey,
      permissions: ['allow_join'],
    };

    // Ek parametreler ekle
    // if (roomId || peerId) {
    //   payload.version = 2;
    //   payload.roles = ['crawler'];
    // }
    // if (roomId) {
    //   payload.roomId = roomId;
    // }
    // if (peerId) {
    //   payload.participantId = peerId;
    // }

    // JwtService ile token oluştur
    return this.jwtService.sign(payload);
  }
  async createMeeting(
    token: string,
    region: string,
    roomId: string,
  ): Promise<any> {
    const url = `${this.apiEndPoint}/rooms`;

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          url,
          { region, roomId, customRoomId: roomId }, // Body, roomId burada gönderiliyor
          {
            headers: {
              Authorization: token,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      return response.data; // Dönen roomId veya diğer bilgileri alır
    } catch (error) {
      throw new HttpException(
        error.response?.data || 'An error occurred while creating the meeting',
        error.response?.status || 500,
      );
    }
  }
}
