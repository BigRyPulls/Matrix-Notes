import type { Measurement, MeasurementType } from '../types';
import { createId } from '../utils/id';
import { toDateKey } from '../utils/date';
import { measurementRepo } from '../storage/repositories';
import { undoService } from './undo.service';

const LABELS: Record<MeasurementType, string> = {
  bodyweight: 'Bodyweight',
  bodyfat: 'Body Fat %',
  chest: 'Chest',
  waist: 'Waist',
  hips: 'Hips',
  bicep: 'Bicep',
  thigh: 'Thigh',
  neck: 'Neck',
  calf: 'Calf',
  custom: 'Custom',
};

export function measurementLabel(type: MeasurementType): string {
  return LABELS[type];
}

export async function logMeasurement(input: {
  type: MeasurementType;
  value: number;
  unit: string;
  date?: string;
  notes?: string;
  label?: string;
}): Promise<Measurement> {
  const now = Date.now();
  const m: Measurement = {
    id: createId('meas'),
    type: input.type,
    label: input.label?.trim() || LABELS[input.type],
    value: input.value,
    unit: input.unit,
    date: input.date ?? toDateKey(),
    notes: input.notes?.trim() ?? '',
    createdAt: now,
    updatedAt: now,
  };
  await measurementRepo.put(m);
  undoService.push('Delete measurement', async () => {
    await measurementRepo.delete(m.id);
  });
  return m;
}

export async function listMeasurements(limit = 100): Promise<Measurement[]> {
  return measurementRepo.getRecent(limit);
}

export async function listByType(type: MeasurementType): Promise<Measurement[]> {
  return measurementRepo.getByType(type);
}

export async function deleteMeasurement(id: string): Promise<void> {
  const existing = await measurementRepo.getById(id);
  if (!existing) return;
  await measurementRepo.delete(id);
  undoService.push('Restore measurement', async () => {
    await measurementRepo.put(existing);
  });
}

export async function latestBodyweight(): Promise<Measurement | undefined> {
  const list = await measurementRepo.getByType('bodyweight');
  return list[0];
}
