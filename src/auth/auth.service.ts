import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from 'src/schemas/user.schema';
import { EmailService } from 'src/email/email.service';
import { RegisterUserInput } from 'src/auth/dto/RegisterUserInput';
import { ActivationUserInput } from 'src/auth/dto/ActivationUserInput';
import * as bcrypt from 'bcrypt';
import { GraphQLError } from 'graphql';
import { LoginUserInput } from './dto/LoginUserInput';

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

  //Register
  private generateActivationCode(): string {
    return Math.floor(Math.random() * 10 ** ACTIVATION_CODE_LENGTH)
      .toString()
      .padStart(ACTIVATION_CODE_LENGTH, '0');
  }

  private async checkExistingUser(email: string): Promise<void> {
    const existingUser = await this.findUserByEmail(email);
    if (existingUser) {
      this.handleError(
        'An account with that email already exists!',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
  private async findUserByEmail(email: string): Promise<User | null> {
    const user = await this.userModel.findOne({ email });
    return user;
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
      this.handleError(
        'Failed to create activation token',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }
  }

  async hashPassword(password: string): Promise<string> {
    try {
      return await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    } catch (error) {
      this.handleError(
        'Failed to hash password',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }
  }

  async registerUser(registerUser: RegisterUserInput) {
    const { email, password } = registerUser;
    try {
      await this.checkExistingUser(email);
      const hashedPassword = await this.hashPassword(password);
      const userWithHashedPassword = {
        ...registerUser,
        password: hashedPassword,
      };
      const activationToken = await this.createActivateToken(
        userWithHashedPassword,
      );
      return { activationToken };
    } catch (error) {
      this.handleError(
        'Failed to register user',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }
  }

  async activationUser(activationUser: ActivationUserInput) {
    const { activationCode, activationToken } = activationUser;
    try {
      const activationData: {
        user: RegisterUserInput;
        activationCode: string;
      } = await this.jwtService.verifyAsync(activationToken);

      if (activationData.activationCode !== activationCode) {
        this.handleError('Invalid activation code', HttpStatus.BAD_REQUEST);
      }

      await this.checkExistingUser(activationData.user.email);

      const user = new this.userModel(activationData.user);
      return await user.save();
    } catch (error) {
      this.handleError(
        'Failed to activate user',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }
  }
  //Register End

  //Login
  async doesPasswordMatch(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }
  async validateUser(email: string, password: string): Promise<User> {
    try {
      const existingUser = await this.findUserByEmail(email);
      if (!existingUser) {
        this.handleError(
          'An account with that email already exists!',
          HttpStatus.BAD_REQUEST,
        );
      }

      const doesPasswordMatch = await this.doesPasswordMatch(
        password,
        existingUser.password,
      );
      if (!doesPasswordMatch) {
        this.handleError('Invalid credentials!', HttpStatus.UNAUTHORIZED);
      }
      return existingUser;
    } catch (error) {
      this.handleError(
        'Failed to validate user',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }
  }
  private generateRefreshToken(email: string, userId: string): string {
    const payload = { email, sub: userId };
    return this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    });
  }
  async loginUser(loginUser: LoginUserInput): Promise<{
    user: User;
    access_token: string;
    refresh_token: string;
  }> {
    const { email, password } = loginUser;
    try {
      const user = await this.validateUser(email, password);
      const payload = { email: user.email, sub: user._id };
      const access_token = await this.jwtService.signAsync(payload);
      const refresh_token = this.generateRefreshToken(email, user._id);
      return { user, access_token, refresh_token };
    } catch (error) {
      this.handleError(
        'Failed to login user',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }
  }
  //Login End
}
