import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export async function POST(req: Request) {
  const SIGNING_SECRET = process.env.CLERK_WEBHOOK_SIGNING_SECRET;

  if (!SIGNING_SECRET) {
    throw new Error(
      "Error: Please add SIGNING_SECRET from Clerk Dashboard to .env or .env"
    );
  }

  // Create new Svix instance with secret
  const wh = new Webhook(SIGNING_SECRET);

  // Get headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error: Missing Svix headers", {
      status: 400,
    });
  }

  // Get body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  let evt: WebhookEvent;

  // Verify payload with headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error: Could not verify webhook:", err);
    return new Response("Error: Verification error", {
      status: 400,
    });
  }

  // Do something with payload
  // For this guide, log payload to console
  const eventType = evt.type;
  console.log(eventType);

  if (eventType === "user.created") {
    const { id, email_addresses, first_name, last_name, image_url, username } =
      evt.data;

    await fetchMutation(api.users.create, {
      clerkId: id,
      email: email_addresses[0].email_address,
      firstName: first_name ?? "",
      lastName: last_name ?? "",
      imageUrl: image_url ?? "",
      username: username ?? "",
    });

    console.log("User created", id);
  }

  if (eventType === "user.updated") {
    const { id, email_addresses, first_name, last_name, image_url, username } =
      evt.data;

    await fetchMutation(api.users.update, {
      clerkId: id as Id<"users">,
      data: {
        email: email_addresses[0].email_address,
        firstName: first_name ?? "",
        lastName: last_name ?? "",
        imageUrl: image_url ?? "",
        username: username ?? "",
      },
    });

    console.log("User updated", id);
  }

  if (eventType === "user.deleted") {
    const { id } = evt.data;

    await fetchMutation(api.users.deleteUser, {
      clerkId: id as Id<"users">,
    }).catch((err) => {
      console.error("Error: Could not delete user:", err);
    });

    console.log("User deleted", id);
  }

  return new Response("Webhook received", { status: 200 });
}
