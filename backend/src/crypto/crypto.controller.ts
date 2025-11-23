import {
    Controller,
    Post,
    Get,
    Body,
    UseGuards,
    Request,
} from "@nestjs/common";
import { CryptoService } from "./crypto.service";
import { AuthGuard } from "@nestjs/passport";
import { AuthenticatedRequest } from "../types/authenticated-request";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { UploadPublicKeyDto } from "./dto/upload-public-key.dto";

@ApiTags("Crypto")
@Controller("crypto")
@ApiBearerAuth()
export class CryptoController {
    constructor(private readonly cryptoService: CryptoService) { }

    @UseGuards(AuthGuard("jwt"))
    @Get("me/public-key")
    @ApiOperation({ summary: "Get user's public key" })
    @ApiResponse({ status: 200, description: "Public key retrieved successfully" })
    @ApiResponse({ status: 404, description: "Public key not found" })
    async getPublicKey(@Request() req: AuthenticatedRequest) {
        return this.cryptoService.getPublicKey(req.user.id as unknown as string);
    }

    @UseGuards(AuthGuard("jwt"))
    @Post("me/public-key")
    @ApiOperation({ summary: "Upload user public key" })
    @ApiResponse({ status: 201, description: "Public key uploaded successfully" })
    async uploadPublicKey(
        @Request() req: AuthenticatedRequest,
        @Body() body: UploadPublicKeyDto,
    ) {
        // Casting req.user.id to string to match the requested UUID type for user_keys.
        // NOTE: If the system uses Integer IDs, this cast is unsafe and the DB operation will fail if the column expects UUID.
        return this.cryptoService.uploadPublicKey(
            req.user.id as unknown as string,
            body.publicKey,
            body.version,
        );
    }
}
