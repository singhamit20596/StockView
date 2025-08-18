import { initTRPC } from '@trpc/server';
import superjson from 'superjson';

export const createTRPCContext = async () => ({
	// Add auth/session later if needed
});

const t = initTRPC.context<typeof createTRPCContext>().create({
	transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;


