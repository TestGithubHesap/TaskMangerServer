import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from 'src/schemas/user.schema';
import { UpdateUserInput } from './dto/updateUserInput';
import { GraphQLError } from 'graphql';

@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}
  private handleError(
    message: string,
    statusCode: HttpStatus,
    error?: any,
  ): never {
    throw new GraphQLError(message, {
      extensions: {
        code: statusCode,
        error,
      },
    });
  }
  async getUser(userId: string): Promise<User> {
    return await this.userModel.findById(userId);
  }
  async getUsers(): Promise<User[]> {
    return await this.userModel.find();
  }

  async userUpdate(
    id: string,
    updateUserInput: UpdateUserInput,
  ): Promise<User> {
    try {
      const user = await this.userModel.findByIdAndUpdate(id, updateUserInput, {
        new: true,
      });

      if (!user) {
        this.handleError(`User with ID ${id} not found`, HttpStatus.NOT_FOUND);
      }
      return user;
    } catch (error) {
      this.handleError(
        `Failed to update user`,
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }
  }
}
