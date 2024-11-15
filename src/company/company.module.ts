import { Module } from '@nestjs/common';
import { CompanyService } from './company.service';
import { CompanyResolver } from './company.resolver';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/schemas/user.schema';
import { Company, CompanySchema } from 'src/schemas/company.schema';
import { AuthModule } from 'src/auth/auth.module';
import {
  CompanyJoinRequest,
  CompanyJoinRequestSchema,
} from 'src/schemas/companyJoinRequest.schema';
import {
  CompanyRequest,
  CompanyRequestSchema,
} from 'src/schemas/companyRequest.schema';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Company.name, schema: CompanySchema },
      { name: CompanyJoinRequest.name, schema: CompanyJoinRequestSchema },
      { name: CompanyRequest.name, schema: CompanyRequestSchema },
    ]),
  ],
  providers: [CompanyService, CompanyResolver],
})
export class CompanyModule {}
