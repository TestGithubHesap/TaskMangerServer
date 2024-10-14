import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from 'src/schemas/user.schema';

@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}
  getHello(): string {
    return 'Hello World! user';
  }

  async getUser(userId: string): Promise<User> {
    return await this.userModel.findById(userId);
  }
  async getUsers(): Promise<User[]> {
    return await this.userModel.find();
  }
  async userUptade() {
    return await this.userModel.updateOne({}, {});
  }
}
