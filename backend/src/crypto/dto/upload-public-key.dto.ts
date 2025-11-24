import { ApiProperty } from "@nestjs/swagger";

export class UploadPublicKeyDto {
    @ApiProperty({
        description: "The public key in Hex format",
        example: "deadbeef...",
    })
    publicKey: string;

    @ApiProperty({
        description: "The version of the public key",
        example: 1,
    })
    version: number;
}
