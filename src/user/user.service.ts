import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { User, UserDocument, UserRole } from 'src/schemas/user.schema';
import { UpdateUserInput } from './dto/updateUserInput';
import { GraphQLError } from 'graphql';
import { PUB_SUB } from 'src/modules/pubSub.module';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { SearchUsersInput } from './dto/searchUsersInput';
interface AggregationResult<T> {
  paginatedResults: T[];
  totalCount: { count: number }[];
}
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

  async userUpdate(updateUserInput: UpdateUserInput): Promise<User> {
    try {
      const user = await this.userModel.findByIdAndUpdate(
        updateUserInput._id,
        updateUserInput,
        {
          new: true,
        },
      );

      if (!user) {
        this.handleError(
          `User with ID ${updateUserInput._id} not found`,
          HttpStatus.NOT_FOUND,
        );
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

  async searchUsers(
    { searchText, page, limit }: SearchUsersInput,
    currentUserId: string,
  ) {
    try {
      const skip = (page - 1) * limit;
      const currentUser = await this.userModel.findById(currentUserId);
      if (!currentUser) {
        this.handleError('Cuurent user not found', HttpStatus.NOT_FOUND);
      }
      const isAdmin = currentUser.roles.includes(UserRole.ADMIN);

      const baseMatchCondition = {
        $or: [
          { firstName: { $regex: searchText, $options: 'i' } },
          { lastName: { $regex: searchText, $options: 'i' } },
          { userName: { $regex: searchText, $options: 'i' } },
        ],
      };

      if (!isAdmin) {
        baseMatchCondition['company'] = currentUser.company.toString();
      }
      const pipeline: PipelineStage[] = [
        {
          $match: baseMatchCondition,
        },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: 'companies',
            let: { companyId: '$company' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ['$_id', { $toObjectId: '$$companyId' }], // companyId'yi ObjectId'ye dönüştürüyoruz
                  },
                },
              },
              {
                $project: {
                  _id: 1,
                  name: 1,
                },
              },
            ],
            as: 'company',
          },
        },
        {
          $unwind: {
            path: '$company',
            preserveNullAndEmptyArrays: true,
          },
        },
      ];

      const results = await this.userModel.aggregate<AggregationResult<User>>([
        ...pipeline,
        {
          $facet: {
            paginatedResults: [
              {
                $project: {
                  firstName: 1,
                  lastName: 1,
                  userName: 1,
                  _id: 1,
                  profilePhoto: 1,
                  company: 1,
                },
              },
            ],
            totalCount: [
              {
                $count: 'count',
              },
            ],
          },
        },
      ]);
      const users = results[0].paginatedResults;
      const totalCount = results[0].totalCount[0]?.count || 0;

      return { users, totalCount };
      // return users;
    } catch (error) {
      this.handleError(
        'Search users failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }
  }

  async uploadProfilePhoto(profilePhoto: string, currentUserId: string) {
    try {
      const updateUser = await this.userModel.findByIdAndUpdate(currentUserId, {
        $set: {
          profilePhoto: profilePhoto,
        },
      });
      return updateUser;
    } catch (error) {
      this.handleError(
        'Upload profile photo failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }
  }

  async getUserProfile(
    userId: string,
    currentUserId: string,
  ): Promise<{ chatId: string | null; user: User | null }> {
    const result = await this.userModel.aggregate([
      // 1. Kullanıcıyı filtrele
      { $match: { _id: new Types.ObjectId(userId) } },
      {
        $lookup: {
          from: 'companies',
          let: { companyId: '$company' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$_id', { $toObjectId: '$$companyId' }], // companyId'yi ObjectId'ye dönüştürüyoruz
                },
              },
            },
            {
              $project: {
                _id: 1,
                name: 1,
              },
            },
          ],
          as: 'company',
        },
      },
      {
        $unwind: {
          path: '$company',
          preserveNullAndEmptyArrays: true,
        },
      },
      // 2. Kullanıcının bilgilerini ekle
      {
        $lookup: {
          from: 'chats', // Chat koleksiyonunu bağla
          let: { userId: '$_id' }, // Kullanıcı ID'sini `let` değişkenine ata
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ['$$userId', '$participants'] }, // Hedef kullanıcı
                    {
                      $in: [new Types.ObjectId(currentUserId), '$participants'],
                    }, // Şu anki kullanıcı
                    { $eq: ['$metadata.type', 'direct'] }, // Sadece direct chatleri kontrol et
                  ],
                },
              },
            },
            { $limit: 1 }, // Sadece ilk eşleşmeyi al
            { $project: { _id: 1 } }, // Sadece chatId'yi al
          ],
          as: 'directChat', // Sonuçları `directChat` alanına ekle
        },
      },

      // 3. `directChat` alanını düzleştir
      {
        $addFields: {
          chatId: { $arrayElemAt: ['$directChat._id', 0] },
        },
      },

      // 4. Gereksiz alanları çıkar
      {
        $project: {
          directChat: 0, // `directChat` dizisini dahil etme
        },
      },
    ]);

    if (!result.length) {
      return { chatId: null, user: null };
    }

    // İlk sonucu döndür
    const { chatId, ...user } = result[0];
    console.log(chatId);
    return result[0];
    // return {
    //   chatId: chatId || null,
    //   user: user as User,
    // };
  }
}
