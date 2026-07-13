import PusherServer from "pusher";
import PusherClient from "pusher-js";

// Server-side Pusher (Used if Juristo V2 needs to broadcast events)
export const pusherServer = new PusherServer({
    appId: process.env.PUSHER_APP_ID!,
    key: process.env.NEXT_PUBLIC_PUSHER_APP_KEY!,
    secret: process.env.PUSHER_SECRET!,
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    useTLS: true,
});

// Client-side Pusher (Used in React components to listen for messages)
export const getPusherClient = () => {
    if (typeof window !== "undefined") {
        return new PusherClient(process.env.NEXT_PUBLIC_PUSHER_APP_KEY!, {
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        });
    }
    return null;
};