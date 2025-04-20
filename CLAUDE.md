# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands
- Frontend: `pnpm dev` - Start development server
- Frontend: `pnpm build` - Build for production
- Frontend: `pnpm preview` - Preview production build
- Backend: `cd backend && pnpm dev` - Run backend in development
- Backend: `cd backend && pnpm build` - Build backend

## Lint/Test Commands
- `pnpm lint` - Run ESLint to check code quality

## Code Style Guidelines
- TypeScript with strict type checking enabled
- Use 2-space indentation and single quotes
- PascalCase for components and interfaces, camelCase for variables/functions
- Use named imports: `import { Component } from './path'`
- Type imports with `import type { Type } from './path'`
- Explicit return types on functions
- Use interfaces for object types
- Always handle errors using try/catch blocks
- Use async/await for asynchronous code
- Always validate data from external sources
- Follow React Hooks pattern for stateful components
- Use TypeScript discriminated unions for complex state management