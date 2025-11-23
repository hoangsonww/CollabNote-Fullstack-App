import { ApiProperty } from "@nestjs/swagger";

export class NoteKeyDto {
    @ApiProperty({
        description: "User ID who has access to the note",
        example: "uuid-here",
    })
    userId: string;

    @ApiProperty({
        description: "Wrapped Data Key for this user (hex string)",
        example: "deadbeef...",
    })
    wrapped_dk: string;

    @ApiProperty({
        description: "Algorithm used for key wrapping",
        example: "ECDH-ES+A256KW",
    })
    alg: string;
}

export class CreateEncryptedNoteDto {
    @ApiProperty({
        description: "Note title (can be plaintext or encrypted)",
        example: "My Secret Note",
    })
    title: string;

    @ApiProperty({
        description: "Encrypted note content (hex string)",
        example: "deadbeef...",
    })
    ciphertext: string;

    @ApiProperty({
        description: "Nonce used for encryption (hex string)",
        example: "abc123...",
    })
    nonce: string;

    @ApiProperty({
        description: "Additional authenticated data",
        required: false,
    })
    aad?: string;

    @ApiProperty({
        description: "Encryption version",
        example: 1,
    })
    encryption_version: number;

    @ApiProperty({
        description: "SHA-256 hash of plaintext content for integrity verification",
        example: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        required: false,
    })
    content_hash?: string;

    @ApiProperty({
        description: "Array of wrapped keys for users with access",
        type: [NoteKeyDto],
    })
    note_keys: NoteKeyDto[];

    @ApiProperty({
        description: "Tags for the note",
        required: false,
        type: [String],
    })
    tags?: string[];

    @ApiProperty({
        description: "Due date",
        required: false,
    })
    dueDate?: string;

    @ApiProperty({
        description: "Color",
        required: false,
    })
    color?: string;
}
