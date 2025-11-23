import { Module } from "@nestjs/common";
import { CryptoController } from "./crypto.controller";
import { CryptoService } from "./crypto.service";
import { SupabaseModule } from "../supabase/supabase.module";

@Module({
    imports: [SupabaseModule],
    controllers: [CryptoController],
    providers: [CryptoService],
    exports: [CryptoService],
})
export class CryptoModule { }
