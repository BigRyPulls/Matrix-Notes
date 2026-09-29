import type { Template, TemplateExercise } from '../../types';
import { BaseRepository } from './base.repo';
import { getDb } from '../db';

class TemplateRepository extends BaseRepository<Template> {
  protected readonly storeName = 'templates' as const;

  async getSorted(): Promise<Template[]> {
    const db = await getDb();
    return db.getAllFromIndex('templates', 'by-name');
  }
}

class TemplateExerciseRepository extends BaseRepository<TemplateExercise> {
  protected readonly storeName = 'templateExercises' as const;

  async getByTemplate(templateId: string): Promise<TemplateExercise[]> {
    const db = await getDb();
    const list = await db.getAllFromIndex('templateExercises', 'by-template', templateId);
    return list.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async deleteByTemplate(templateId: string): Promise<void> {
    const items = await this.getByTemplate(templateId);
    await Promise.all(items.map((t) => this.delete(t.id)));
  }
}

export const templateRepo = new TemplateRepository();
export const templateExerciseRepo = new TemplateExerciseRepository();
