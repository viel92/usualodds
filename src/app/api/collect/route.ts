// @ts-nocheck
// DEPRECATED: TypeScript collectors disabled - Use Python pipeline instead
// See: scripts/python_pipeline/main_collector.py

import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ 
    success: false,
    message: 'TypeScript collectors deprecated. Use Python pipeline: python scripts/python_pipeline/main_collector.py',
    redirect: '/admin/python-collector',
    timestamp: new Date().toISOString()
  }, { status: 410 }); // Gone
}

export async function GET() {
  return NextResponse.json({
    message: 'UsualOdds Collection API - DEPRECATED',
    version: 'MVP.1',
    deprecated: true,
    alternative: 'Use Python pipeline: python scripts/python_pipeline/main_collector.py',
    timestamp: new Date().toISOString()
  });
}