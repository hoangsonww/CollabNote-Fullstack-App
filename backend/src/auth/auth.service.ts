import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";

@Injectable()
export class AuthService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly jwtService: JwtService,
  ) {}

  async register(username: string, email: string, password: string) {
    const { data: existingUsers } = await this.supabaseService
      .getClient()
      .from("users")
      .select()
      .or(`email.eq.${email},username.eq.${username}`);
    if (existingUsers && existingUsers.length > 0) {
      throw new BadRequestException("User or email already exists");
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const { error: insertError } = await this.supabaseService
      .getClient()
      .from("users")
      .insert([{ username, email, password: hashedPassword }]);
    if (insertError) {
      throw new BadRequestException(insertError.message);
    }
    return { message: "User registered successfully" };
  }

  async login(email: string, password: string) {
    const { data: users } = await this.supabaseService
      .getClient()
      .from("users")
      .select()
      .eq("email", email);
    if (!users || users.length === 0) {
      throw new UnauthorizedException("Invalid credentials");
    }
    const user = users[0];
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException("Invalid credentials");
    }
    const payload = {
      sub: user.id,
      username: user.username,
      email: user.email,
    };
    const token = this.jwtService.sign(payload);
    return { access_token: token };
  }

  async checkEmailExists(email: string) {
    const { data: users } = await this.supabaseService
      .getClient()
      .from("users")
      .select()
      .eq("email", email);
    if (!users || users.length === 0) {
      return { exists: false };
    }
    return { exists: true };
  }

  async resetPassword(
    email: string,
    newPassword: string,
    confirmPassword: string,
  ) {
    if (newPassword !== confirmPassword) {
      throw new BadRequestException("Passwords do not match");
    }
    const { data: users } = await this.supabaseService
      .getClient()
      .from("users")
      .select()
      .eq("email", email);
    if (!users || users.length === 0) {
      throw new NotFoundException("Email not found");
    }
    const user = users[0];
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const { error: updateErr } = await this.supabaseService
      .getClient()
      .from("users")
      .update({ password: hashedPassword })
      .eq("id", user.id);
    if (updateErr) {
      throw new BadRequestException(updateErr.message);
    }
    return { message: "Password has been reset successfully" };
  }

  async validateUser(userId: number) {
    const { data: users } = await this.supabaseService
      .getClient()
      .from("users")
      .select()
      .eq("id", userId);
    if (!users || users.length === 0) {
      return null;
    }
    return users[0];
  }
}
