import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const globalForPrisma = globalThis as unknown as {
	prisma: PrismaClient | undefined;
};

function getDatabaseUrl(): string {
	if (process.env.DATABASE_URL) {
		return process.env.DATABASE_URL;
	}

	// Resolve to the project root dev.db file
	const currentDir = dirname(fileURLToPath(import.meta.url));
	const projectRoot = resolve(currentDir, '..', '..', '..');
	return `file:${resolve(projectRoot, 'dev.db')}`;
}

function createPrismaClient() {
	const adapter = new PrismaBetterSqlite3({
		url: getDatabaseUrl()
	});
	return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
	globalForPrisma.prisma = prisma;
}
