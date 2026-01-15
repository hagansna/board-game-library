import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const globalForPrisma = globalThis as unknown as {
	prisma: PrismaClient | undefined;
};

function getDatabaseUrl(): string {
	const envUrl = process.env.DATABASE_URL;

	// Resolve to the project root
	const currentDir = dirname(fileURLToPath(import.meta.url));
	const projectRoot = resolve(currentDir, '..', '..', '..');

	if (envUrl) {
		// Handle relative file: URLs by resolving them from project root
		if (envUrl.startsWith('file:./')) {
			const relativePath = envUrl.replace('file:./', '');
			return `file:${resolve(projectRoot, relativePath)}`;
		}
		return envUrl;
	}

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
