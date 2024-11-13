import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Company } from 'src/schemas/company.schema';
import { User } from 'src/schemas/user.schema';

@ObjectType()
export class SearchCompaniesObject {
  @Field(() => [Company])
  companies: Company[];

  @Field()
  totalCount: number;
}
