<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
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
					This application uses shadcn-svelte components for a consistent, accessible UI.
				</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="space-y-2">
					<Label for="example-input">Example Input</Label>
					<Input id="example-input" placeholder="Type something..." />
				</div>
				<div class="flex gap-2">
					<Button>Primary Button</Button>
					<Button variant="secondary">Secondary</Button>
					<Button variant="outline">Outline</Button>
					<Button variant="destructive">Destructive</Button>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</div>
