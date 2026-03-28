/**
 * Seed Script for Learning Engine
 * 
 * Populates sample modules for React and Node.js to test the vibe check flow.
 * Run with: node seed_modules.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Module = require('./models/Module');

const SAMPLE_MODULES = [
    // --- React Stack ---
    {
        stack: 'React',
        order: 1,
        title: 'Component State & Props',
        description: 'Learn how to manage data with useState and pass it via props.',
        concept: 'useState and Prop Drilling',
        challenge: 'Create a "Counter" component with two buttons: one that increments the count and one that decrements it. Pass the count value as a prop to a child "Display" component.',
        starterCode: 'import React, { useState } from "react";\n\nconst Counter = () => {\n  // Your code here\n  return (<div>Counter</div>);\n};',
        difficulty: 'beginner',
        xpReward: 100
    },
    {
        stack: 'React',
        order: 2,
        title: 'Effect Hook (useEffect)',
        description: 'Master side effects and lifecycle with useEffect.',
        concept: 'useEffect Dependency Arrays',
        challenge: 'Fetch data from "https://jsonplaceholder.typicode.com/todos/1" when the component mounts and display the title. Make sure you don\'t create an infinite loop!',
        starterCode: 'import React, { useEffect, useState } from "react";\n\nconst DataFetcher = () => {\n  // Your code here\n  return (<div>Fetching...</div>);\n};',
        difficulty: 'intermediate',
        xpReward: 150
    },

    // --- Node.js Stack ---
    {
        stack: 'Node.js',
        order: 1,
        title: 'Express Routing',
        description: 'Build your first API endpoint with Express.',
        concept: 'RESTful Routes',
        challenge: 'Create a GET route at "/api/hello" that returns a JSON object: { message: "Hello World" }.',
        starterCode: 'const express = require("express");\nconst app = express();\n\n// Your route here\n',
        difficulty: 'beginner',
        xpReward: 100
    }
];

async function seed() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('📦 Connected to MongoDB');

        // Clear existing modules
        await Module.deleteMany({});
        console.log('🗑️  Cleared existing modules');

        // Insert samples
        await Module.insertMany(SAMPLE_MODULES);
        console.log(`✅ Successfully seeded ${SAMPLE_MODULES.length} modules!`);

        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding failed:', err);
        process.exit(1);
    }
}

seed();
