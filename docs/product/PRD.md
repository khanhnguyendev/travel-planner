# Product Requirements Document

## Product Name
Travel Planner

## Overview
Travel Planner is a collaborative web application for group trip planning. Users can create travel projects, organize places into custom categories, vote on destinations, invite members, and split shared expenses.

## Core Problem
Groups often plan trips using spreadsheets, chat messages, and scattered links. This leads to poor visibility, duplicate suggestions, unclear decisions, and messy expense tracking.

## Goal
Create a visually engaging shared planning workspace where a group can collect places, decide together, and manage trip spending in one app.

## Primary Users
- Group organizer who creates the project
- Friends or family members invited into the project
- Collaborators who vote on places and share expenses

## Core Features
1. Create travel projects
2. Create custom categories such as attractions, food, cafes, hotels, and shopping
3. Paste a Google Maps link to resolve place details
4. Display place name, address, rating, and selected reviews from Google data
5. Vote on places within a project
6. Owner can invite members and manage permissions
7. Members can create shared expenses and upload receipt images

## Roles
- Owner: full control, invite/remove members, manage roles, archive project
- Admin: manage places, members, and expenses except owner-only actions
- Editor: add places, vote, add expenses, upload receipts
- Viewer: view project and optionally vote if allowed

## MVP Scope
- Authentication
- Project creation and membership
- Categories and places
- Google Maps link resolution
- Place voting
- Shared expenses with receipt uploads

## Out of Scope for MVP
- Chat
- Notifications
- Offline mode
- Complex itinerary scheduling
- Advanced debt settlement automation

## Success Criteria
- A project owner can create a trip and invite members
- Members can add places from Google Maps links
- The app shows useful place details and reviews
- Members can vote on places
- The group can upload receipts and track shared expenses
