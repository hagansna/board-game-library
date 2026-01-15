<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { enhance } from '$app/forms';

	let { form } = $props();
</script>

<div class="min-h-screen bg-background p-8">
	<div class="mx-auto max-w-md space-y-8">
		<div class="text-center">
			<h1 class="text-3xl font-bold text-foreground">Create Account</h1>
			<p class="mt-2 text-muted-foreground">Sign up to start managing your board game library</p>
		</div>

		<Card.Root>
			<Card.Header>
				<Card.Title>Register</Card.Title>
				<Card.Description>Enter your email and password to create an account.</Card.Description>
			</Card.Header>
			<Card.Content>
				<form method="POST" use:enhance class="space-y-4">
					{#if form?.error}
						<div class="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
							{form.error}
						</div>
					{/if}

					<div class="space-y-2">
						<Label for="email">Email</Label>
						<Input
							id="email"
							name="email"
							type="email"
							placeholder="you@example.com"
							value={form?.email ?? ''}
							required
						/>
						{#if form?.errors?.email}
							<p class="text-sm text-destructive">{form.errors.email}</p>
						{/if}
					</div>

					<div class="space-y-2">
						<Label for="password">Password</Label>
						<Input
							id="password"
							name="password"
							type="password"
							placeholder="At least 8 characters"
							required
						/>
						{#if form?.errors?.password}
							<p class="text-sm text-destructive">{form.errors.password}</p>
						{/if}
					</div>

					<Button type="submit" class="w-full">Register</Button>
				</form>
			</Card.Content>
			<Card.Footer class="flex justify-center">
				<p class="text-sm text-muted-foreground">
					Already have an account?
					<a href="/auth/login" class="text-primary underline-offset-4 hover:underline">Sign in</a>
				</p>
			</Card.Footer>
		</Card.Root>
	</div>
</div>
