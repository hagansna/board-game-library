<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';

	let { form } = $props();
</script>

<div class="min-h-screen bg-background p-8">
	<div class="mx-auto max-w-md space-y-8">
		<div class="text-center">
			<h1 class="text-3xl font-bold text-foreground">Welcome Back</h1>
			<p class="mt-2 text-muted-foreground">Sign in to access your board game library</p>
		</div>

		<Card.Root>
			<Card.Header>
				<Card.Title>Sign In</Card.Title>
				<Card.Description>Enter your email and password to access your account.</Card.Description>
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
							placeholder="Enter your password"
							required
						/>
						{#if form?.errors?.password}
							<p class="text-sm text-destructive">{form.errors.password}</p>
						{/if}
					</div>

					<Button type="submit" class="w-full">Sign In</Button>
				</form>
			</Card.Content>
			<Card.Footer class="flex justify-center">
				<p class="text-sm text-muted-foreground">
					Don't have an account?
					<a
						href={resolve('/auth/register')}
						class="text-primary underline-offset-4 hover:underline">Register</a
					>
				</p>
			</Card.Footer>
		</Card.Root>
	</div>
</div>
