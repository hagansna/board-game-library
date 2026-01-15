<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { resolve } from '$app/paths';
</script>

<div class="min-h-screen bg-background p-8">
	<div class="mx-auto max-w-2xl space-y-8">
		<div class="text-center">
			<h1 class="text-4xl font-bold text-foreground">Board Game Library</h1>
			<p class="mt-2 text-muted-foreground">
				Manage your board game collection with AI-powered recognition
			</p>
		</div>

		<Card.Root>
			<Card.Header>
				<Card.Title>Welcome</Card.Title>
				<Card.Description>
					Track your board game collection with ease. Upload photos of game boxes and let AI
					automatically add them to your library.
				</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="flex flex-col gap-3 sm:flex-row sm:justify-center">
					<Button href={resolve('/auth/login')}>Sign In</Button>
					<Button variant="outline" href={resolve('/auth/register')}>Create Account</Button>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</div>
