import {
  Controller,
  Get,
  Post,
  Body,
  Request,
  UseGuards,
  Param,
  Patch,
  Delete,
  Query,
} from "@nestjs/common";
import { NotesService } from "./notes.service";
import { AuthGuard } from "@nestjs/passport";
import { AuthenticatedRequest } from "../types/authenticated-request";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
} from "@nestjs/swagger";

@ApiTags("Notes")
@Controller("notes")
@ApiBearerAuth()
/**
 * Controller for handling note-related endpoints
 */
export class NotesController {
  /**
   * Constructor for the NotesController
   *
   * @param notesService The NotesService instance
   */
  constructor(private readonly notesService: NotesService) { }

  @UseGuards(AuthGuard("jwt"))
  @Get()
  @ApiOperation({ summary: "Retrieve user notes" })
  @ApiQuery({
    name: "search",
    required: false,
    description: "Search term to filter notes",
  })
  @ApiQuery({
    name: "tag",
    required: false,
    description: "Tag to filter notes",
  })
  @ApiResponse({
    status: 200,
    description: "List of user notes retrieved successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized access" })
  /**
   * Retrieve notes for the authenticated user
   */
  async getNotes(
    @Request() req: AuthenticatedRequest,
    @Query("search") search?: string,
    @Query("tag") tag?: string,
  ) {
    return this.notesService.getUserNotes(req.user.id, search, tag);
  }

  @UseGuards(AuthGuard("jwt"))
  @Post()
  @ApiOperation({ summary: "Create a new note" })
  @ApiResponse({ status: 201, description: "Note created successfully" })
  @ApiResponse({ status: 400, description: "Invalid input" })
  @ApiBody({
    description: "Details of the new note",
    schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Title of the note" },
        content: { type: "string", description: "Content of the note" },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Tags associated with the note",
        },
        dueDate: {
          type: "string",
          format: "date-time",
          description: "Due date of the note (optional)",
        },
        color: {
          type: "string",
          description: "Color associated with the note (optional)",
        },
      },
    },
  })
  /**
   * Create a new note for the authenticated user
   */
  async createNote(
    @Request() req: AuthenticatedRequest,
    @Body()
    body: {
      title: string;
      content: string;
      tags?: string[];
      dueDate?: string;
      color?: string;
    },
  ) {
    return this.notesService.createNote({
      userId: req.user.id,
      title: body.title,
      content: body.content,
      tags: body.tags,
      dueDate: body.dueDate,
      color: body.color,
    });
  }

  @UseGuards(AuthGuard("jwt"))
  @Patch(":id")
  @ApiOperation({ summary: "Update a note" })
  @ApiResponse({ status: 200, description: "Note updated successfully" })
  @ApiResponse({ status: 404, description: "Note not found" })
  @ApiParam({ name: "id", description: "ID of the note to update" })
  /**
   * Update a note for the authenticated user
   */
  async updateNote(
    @Request() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() updates: any,
  ) {
    return this.notesService.updateNote(+id, req.user.id, updates);
  }

  @UseGuards(AuthGuard("jwt"))
  @Post(":id/share")
  @ApiOperation({ summary: "Share a note with another user" })
  @ApiResponse({ status: 200, description: "Note shared successfully" })
  @ApiResponse({ status: 404, description: "Note not found or user not found" })
  @ApiParam({ name: "id", description: "ID of the note to share" })
  @ApiBody({
    description: "Target username of the user to share the note with",
    schema: {
      type: "object",
      properties: {
        targetUsername: {
          type: "string",
          description: "Username of the user to share the note with",
        },
      },
    },
  })
  /**
   * Share a note with another user
   */
  async shareNote(
    @Request() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() body: { targetUsername: string },
  ) {
    return this.notesService.shareNoteWithUser(
      +id,
      req.user.id,
      body.targetUsername,
    );
  }

  @UseGuards(AuthGuard("jwt"))
  @Delete(":id")
  @ApiOperation({ summary: "Delete a note" })
  @ApiResponse({ status: 200, description: "Note deleted successfully" })
  @ApiResponse({ status: 404, description: "Note not found" })
  @ApiParam({ name: "id", description: "ID of the note to delete" })
  /**
   * Delete a note for the authenticated user
   */
  async removeNoteForUser(
    @Request() req: AuthenticatedRequest,
    @Param("id") id: string,
  ) {
    return this.notesService.removeNoteForUser(+id, req.user.id);
  }

  @UseGuards(AuthGuard("jwt"))
  @Post("reorder")
  @ApiOperation({ summary: "Reorder user notes" })
  @ApiResponse({ status: 200, description: "Notes reordered successfully" })
  @ApiResponse({ status: 400, description: "Invalid input" })
  @ApiBody({
    description: "New order of note IDs",
    schema: {
      type: "object",
      properties: {
        noteOrder: {
          type: "array",
          items: { type: "number" },
          description: "Array of note IDs in the desired order",
        },
      },
    },
  })
  /**
   * Reorder notes for the authenticated user
   */
  async reorderNotes(
    @Request() req: AuthenticatedRequest,
    @Body() body: { noteOrder: number[] },
  ) {
    return this.notesService.reorderNotes(req.user.id, body.noteOrder);
  }

  @UseGuards(AuthGuard("jwt"))
  @Get(":id/key")
  @ApiOperation({ summary: "Get the encrypted key for a note" })
  @ApiResponse({ status: 200, description: "Key retrieved successfully" })
  @ApiResponse({ status: 404, description: "Key not found" })
  @ApiParam({ name: "id", description: "ID of the note" })
  /**
   * Get the encrypted key for a note
   */
  async getNoteKey(
    @Request() req: AuthenticatedRequest,
    @Param("id") id: string,
  ) {
    // Casting req.user.id to string/number as needed by service.
    // The service handles loose types.
    return this.notesService.getNoteKey(id, req.user.id);
  }

  @UseGuards(AuthGuard("jwt"))
  @Post("encrypted")
  @ApiOperation({ summary: "Create an encrypted note with E2EE" })
  @ApiResponse({ status: 201, description: "Encrypted note created successfully" })
  @ApiResponse({ status: 400, description: "Invalid input" })
  /**
   * Create an encrypted note
   */
  async createEncryptedNote(
    @Request() req: AuthenticatedRequest,
    @Body() body: any, // Will be CreateEncryptedNoteDto
  ) {
    return this.notesService.createEncryptedNote(req.user.id, body);
  }

  @UseGuards(AuthGuard("jwt"))
  @Post(":id/share")
  @ApiOperation({ summary: "Share an encrypted note with a collaborator" })
  @ApiResponse({ status: 200, description: "Note shared successfully" })
  @ApiResponse({ status: 404, description: "Note not found" })
  @ApiParam({ name: "id", description: "ID of the note to share" })
  /**
   * Share an encrypted note
   */
  async shareEncryptedNote(
    @Request() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() body: any, // Will be ShareNoteDto
  ) {
    return this.notesService.shareEncryptedNote(
      id,
      req.user.id,
      body.collaboratorUserId,
      body.wrapped_dk,
      body.alg,
    );
  }

  @UseGuards(AuthGuard("jwt"))
  @Delete(":id/share/:userId")
  @ApiOperation({ summary: "Revoke access to an encrypted note" })
  @ApiResponse({ status: 200, description: "Access revoked successfully" })
  @ApiResponse({ status: 404, description: "Note not found" })
  @ApiParam({ name: "id", description: "ID of the note" })
  @ApiParam({ name: "userId", description: "ID of the user to revoke access from" })
  /**
   * Unshare an encrypted note (revoke access)
   */
  async unshareNote(
    @Request() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Param("userId") userId: string,
  ) {
    return this.notesService.unshareNote(id, req.user.id, userId);
  }
}
