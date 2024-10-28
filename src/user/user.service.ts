import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from 'src/schemas/user.schema';
import { UpdateUserInput } from './dto/updateUserInput';
import { GraphQLError } from 'graphql';
import { PUB_SUB } from 'src/modules/pubSub.module';
import { RedisPubSub } from 'graphql-redis-subscriptions';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @Inject(PUB_SUB) private readonly pubSub: RedisPubSub,
  ) {}
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

  async getCompanyUsers(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      this.handleError(
        `User with ID ${userId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }
    return await this.userModel
      .find({
        company: user.company,
      })
      .select('_id firstName lastName roles');
  }

  async updateUserStatus(userId: string, newStatus: string) {
    try {
      const currentUser = await this.userModel.findById(userId);

      if (!currentUser) {
        this.handleError('User not found', HttpStatus.NOT_FOUND);
      }

      if (currentUser.status === newStatus) {
        return true;
      }

      await this.userModel.findByIdAndUpdate(
        {
          _id: userId,
        },
        { status: newStatus },
      );

      this.pubSub.publish('changeUserStatus', {
        changeUserStatus: {
          userId,
          status: newStatus,
        },
      });

      return true;
    } catch (error) {
      this.handleError(
        'Update user status failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }
  }
}
