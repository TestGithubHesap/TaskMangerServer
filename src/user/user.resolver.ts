import { Query, Resolver } from '@nestjs/graphql';

@Resolver('User')
export class UserResolver {
  @Query(() => String)
  async getHelloUser() {
    return `Merhaba ,  hello user!`;
  }
}
