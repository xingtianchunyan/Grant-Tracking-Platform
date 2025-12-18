import { Interaction, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";

export type AssignedProject = { id: number; name: string };

export async function safeChannelSend(interaction: Interaction, content: string) {
  if (interaction.channel && typeof (interaction.channel as any).isTextBased === "function") {
    if ((interaction.channel as any).isTextBased()) {
      await (interaction.channel as any).send(content);
    }
  }
}

export async function postJson(url: string, body: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

export async function patchJson(url: string, body: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

export async function getJson<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
    const res = await fetch(url, { headers: { "Content-Type": "application/json", ...headers } });
    if (!res.ok) throw new Error(`Failed to load data (${res.status})`);
    return (await res.json()) as T;
}

async function handleResponse(res: Response) {
  if (!res.ok) {
    try {
      const j = (await res.json()) as any;
      if (j?.error) throw new Error(j.error);
      if (j?.message) throw new Error(j.message);
      throw new Error(`${res.status} ${res.statusText}`);
    } catch {
      const t = await res.text().catch(() => "");
      throw new Error(t || `${res.status} ${res.statusText}`);
    }
  }
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export function buildProjectSelect(
    customId: string,
    projects: AssignedProject[],
    placeholder: string
) {
    const options = projects.slice(0, 25).map((p) =>
        new StringSelectMenuOptionBuilder().setLabel(p.name).setValue(String(p.id))
    );

    const select = new StringSelectMenuBuilder()
        .setCustomId(customId)
        .setPlaceholder(placeholder)
        .addOptions(options);

    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
}
