import { ApiProperty } from "@nestjs/swagger";

export class ShareNoteDto {
    @ApiProperty({
        description: "User ID of the collaborator to share with",
        example: "uuid-here",
    })
    collaboratorUserId: string;

    @ApiProperty({
        description: "Wrapped Data Key for the collaborator (hex string)",
        example: "deadbeef...",
    })
    wrapped_dk: string;

    @ApiProperty({
        description: "Algorithm used for key wrapping",
        example: "ECDH-ES+A256KW",
        required: false,
    })
    alg?: string;
}
