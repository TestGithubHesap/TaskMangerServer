import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from 'src/schemas/user.schema';
import { EmailService } from 'src/services/email.service';
import { RegisterUserInput } from 'src/types/InputTypes/RegisterUserInput';
import { ActivationUserInput } from 'src/types/InputTypes/ActivationUserInput';
import * as bcrypt from 'bcrypt';
import { GraphQLError } from 'graphql';

// Configuration constants
const ACTIVATION_CODE_LENGTH = 4;
const ACTIVATION_TOKEN_EXPIRY = '5m';
const BCRYPT_SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  private handleError(message: string, statusCode: HttpStatus, error?: any): never {
    throw new GraphQLError(message, {
      extensions: {
        code: statusCode,
        error,
      },
    });
  }

  private generateActivationCode(): string {
    return Math.floor(Math.random() * (10 ** ACTIVATION_CODE_LENGTH)).toString().padStart(ACTIVATION_CODE_LENGTH, '0');
  }

  private async checkExistingUser(email: string): Promise<void> {
    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      this.handleError('An account with that email already exists!', HttpStatus.BAD_REQUEST);
    }
  }

  async createActivateToken(user: RegisterUserInput): Promise<string> {
    try {
      const activationCode = this.generateActivationCode();
      const token = await this.jwtService.signAsync(
        { user, activationCode },
        { expiresIn: ACTIVATION_TOKEN_EXPIRY },
      );

      await this.emailService.sendMail({
        email: user.email,
        subject: 'Activation Code',
        template: './activation-mail',
        name: `${user.firstName} ${user.lastName}`,
        activationCode,
      });

      return token;
    } catch (error) {
      this.handleError('Failed to create activation token', HttpStatus.INTERNAL_SERVER_ERROR, error);
    }
  }

  async hashPassword(password: string): Promise<string> {
    try {
      return await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    } catch (error) {
      this.handleError('Failed to hash password', HttpStatus.INTERNAL_SERVER_ERROR, error);
    }
  }

  async registerUser(registerUser: RegisterUserInput) {
    const { email, password } = registerUser;
    try {
      await this.checkExistingUser(email);
      const hashedPassword = await this.hashPassword(password);
      const userWithHashedPassword = { ...registerUser, password: hashedPassword };
      const activationToken = await this.createActivateToken(userWithHashedPassword);
      return { activationToken };
    } catch (error) {
      this.handleError('Failed to register user', HttpStatus.INTERNAL_SERVER_ERROR, error);
    }
  }

  async activationUser(activationUser: ActivationUserInput) {
    const { activationCode, activationToken } = activationUser;
    try {
      const activationData: { user: RegisterUserInput; activationCode: string } =
        await this.jwtService.verifyAsync(activationToken);

      if (activationData.activationCode !== activationCode) {
        this.handleError('Invalid activation code', HttpStatus.BAD_REQUEST);
      }

      await this.checkExistingUser(activationData.user.email);

      const user = new this.userModel(activationData.user);
      return await user.save();
    } catch (error) {
      this.handleError('Failed to activate user', HttpStatus.INTERNAL_SERVER_ERROR, error);
    }
  }
}