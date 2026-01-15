# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Board Game Library - A web application for managing a personal board game collection with AI-powered image recognition to automatically catalog games from photos.

### Core Features
- User authentication and login
- Board game library management (CRUD operations)
- AI-powered image analysis to extract game information from uploaded photos
- Automatic addition of recognized games to user's library

## Technology Stack

- **Framework**: SvelteKit
- **AI Service**: Google Gemini Flash Preview (vision capabilities)
- **Database**: TBD (SQLite for MVP or PostgreSQL for production)
- **Authentication**: SvelteKit sessions or lucia-auth
- **UI Components**: shadcn-svelte
- **Design**: Dark mode support with theme persistence

## Code Quality Standards

- **Linting**: All code must pass ESLint checks before commit
- **Formatting**: Prettier must be configured and used for consistent code formatting
- **Test Coverage**: Maintain test coverage for critical functionality (authentication, library operations, AI integration)

## Project Status

This is a greenfield project in planning phase.
