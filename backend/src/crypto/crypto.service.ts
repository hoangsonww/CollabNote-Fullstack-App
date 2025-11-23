import { Injectable, BadRequestException } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";

@Injectable()
export class CryptoService {
  constructor(private readonly supabaseService: SupabaseService) { }

  /**
   * Uploads or updates the user's public key.
   *
   * @param userId The ID of the user
   * @param publicKey The public key (Buffer or Hex string)
   * @param version The version of the public key
   */
  async uploadPublicKey(
    userId: string,
    publicKey: Buffer | string,
    version: number,
  ) {
    // Ensure publicKey is treated as a Buffer for bytea storage if it's not already
    // Supabase JS client might handle hex strings for bytea, but Buffer is safer.
    // If it comes as a hex string from JSON, we might need to convert it.
    // However, the user request says "strictly handles bytea (Buffer/Uint8Array)".
    // We'll assume the controller passes it correctly or we convert it here.

    let keyBuffer: Buffer;
    if (Buffer.isBuffer(publicKey)) {
      keyBuffer = publicKey;
    } else if (typeof publicKey === "string") {
      // Assume hex or base64? Usually hex for keys.
      // Let's try to interpret as hex if string.
      keyBuffer = Buffer.from(publicKey, "hex");
    } else {
      throw new BadRequestException("Invalid public key format");
    }

    const { data, error } = await this.supabaseService
      .getClient()
      .from("user_keys")
      .upsert(
        {
          user_id: userId,
          pub_key: keyBuffer,
          pub_key_version: version,
        },
        { onConflict: "user_id" },
      )
      .select();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return { message: "Public key uploaded successfully", data };
  }

  /**
   * Retrieves the user's public key.
   *
   * @param userId The ID of the user
   */
  async getPublicKey(userId: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from("user_keys")
      .select("pub_key, pub_key_version")
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      throw new BadRequestException("Public key not found");
    }

    // Convert Buffer to hex string for JSON response
    const pubKeyHex = data.pub_key.toString("hex");

    return {
      pubKey: pubKeyHex,
      version: data.pub_key_version,
    };
  }
}
