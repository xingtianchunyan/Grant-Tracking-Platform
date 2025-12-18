# Implementation Plan: "/create project and milestone"

This plan outlines the steps to implement the `/create project and milestone` Discord command, enabling automated project creation from Discord messages.

## 1. Discord Command Implementation (`lib/discord/commands/create-project.ts`)

We will create a new command module `create-project.ts` that handles the slash command.

*   **Command Definition**:
    *   Name: `create`
    *   Subcommand: `project-and-milestone`
    *   Option: `message_link` (String, required) - The link to the Discord message containing project details.

*   **Logic Flow**:
    1.  **Parse Message Link**: Extract `guildId`, `channelId`, and `messageId` from the provided link.
    2.  **Fetch Message**: Use the Discord Client (via `interaction.client`) to fetch the actual message content.
    3.  **Generate Creation URL**: Construct a URL to the frontend `/admin/projects/new` page, appending the message content as a query parameter (or storing it temporarily if too large).
    4.  **Reply**: Send an ephemeral message with a "Click to Create Project" button (Link Button) pointing to the generated URL.

## 2. Frontend Integration (`app/admin/projects/new/page.tsx`)

We need to update the existing project creation page to handle the incoming data from Discord.

*   **URL Parameter Handling**:
    *   Check for a `discord_content` (or similar) query parameter on page load.
    *   If present, trigger the AI parsing logic.

*   **AI Parsing & Auto-fill**:
    *   **Simulated AI (MVP)** / **Actual AI**: Since the requirement mentions "AI analysis", we will need an endpoint or a client-side utility to parse the unstructured text into structured form data.
    *   **Mapping**: Map parsed fields (Title, Description, etc.) to the `formData` state.
    *   **Visual Feedback**: Highlight fields that were auto-filled to distinguish them from empty ones.

*   **Milestone Redirection**:
    *   Ensure the existing redirection to `/admin/projects/${id}/milestones/new` is preserved and functional.
    *   Pass relevant data (like "duration" or "milestone count" if parsed) to the milestone page via query params or state.

## 3. AI Service Integration (Mock/Stub for now, or simple Regex)

To satisfy the "AI analysis" requirement without an external heavy API dependency immediately, we can implement a `parseProjectFromText` utility.

*   **Parser Logic**:
    *   Extract "Project Name" / "Title" lines.
    *   Extract "Description" / "Background".
    *   Extract "Budget" / "Funding".
    *   Extract "Links" (GitHub, etc.).

## 4. Execution Steps

1.  **Create Command**: Implement `lib/discord/commands/create-project.ts`.
2.  **Register Command**: Update `lib/discord/commands/index.ts` to include the new command.
3.  **Update Frontend**: Modify `app/admin/projects/new/page.tsx` to read `?source=discord&content=...` and pre-fill the form.
4.  **Bot Update**: Restart the bot to register the new command.

## 5. Limitations & Notes

*   **Message Link Access**: The bot must have "Read Message History" permission in the channel where the message is linked from.
*   **Content Length**: Discord message links are short, but passing full content via URL query params has limits (~2000 chars for safe browser compatibility).
    *   *Strategy*: If content is short, use URL params. If long, we might need to store it in a temporary cache (Redis/DB) and pass a `refId`. For this MVP, we'll try URL params first, truncating if necessary, or (better) just pass the message ID and have the frontend call an API to fetch it?
    *   *Revised Strategy*: The frontend cannot easily fetch Discord messages directly (CORS, auth).
    *   *Best Approach*: The Bot fetches the content. If it's short, put in URL. If it's long, we might need a robust way. Let's stick to URL params with `encodeURIComponent` for the first iteration, as project proposals in Discord are usually concise enough or linked.

## 6. Detailed Tasks

1.  Create `lib/discord/commands/create-project.ts`.
2.  Register in `lib/discord/commands/index.ts`.
3.  Modify `app/admin/projects/new/page.tsx` to accept `searchParams`.
4.  Implement `useEffect` in the page to parse `searchParams.get('content')` and fill `formData`.
