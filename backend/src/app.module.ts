import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { GraphQLModule } from "@nestjs/graphql";
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { join } from "path";

import { AuthModule } from "./auth/auth.module";
import { NotesModule } from "./notes/notes.module";
import { ProfileModule } from "./profile/profile.module";
import { SupabaseModule } from "./supabase/supabase.module";
import { CryptoModule } from "./crypto/crypto.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), "src/schema.gql"),
      playground: true,
      debug: true,
    }),
    AuthModule,
    NotesModule,
    SupabaseModule,
    ProfileModule,
    CryptoModule,
  ],
})
/**
 * Main application module
 */
export class AppModule { }
