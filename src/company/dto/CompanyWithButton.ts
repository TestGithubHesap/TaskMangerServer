import { ObjectType, Field } from '@nestjs/graphql';
import { Company } from 'src/schemas/company.schema';

@ObjectType()
export class CompanyWithButton {
  @Field(() => Company)
  company: Company;

  @Field(() => Boolean)
  showCompanyjoinButton: boolean;

  @Field(() => Boolean, { nullable: true })
  isJoinRequest?: boolean;

  @Field(() => Boolean)
  isCompanyEmploye: boolean;
}
