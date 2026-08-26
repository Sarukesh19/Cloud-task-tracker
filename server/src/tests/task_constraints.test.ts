import request from 'supertest';
import { app } from '../index';
import { db } from '../db';

describe('Collaborative Task Tracker Backend API & Constraint Engine', () => {
  let adminToken: string;
  let sarahToken: string;
  let timmyToken: string;

  beforeAll(async () => {
    // Reset database to initial state
    db.resetToSeed();

    // Login as Admin (Alex Lead)
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ userId: 'user-admin-1' });
    adminToken = adminRes.body.token;

    // Login as Member (Sarah Chen)
    const sarahRes = await request(app)
      .post('/api/auth/login')
      .send({ userId: 'user-member-1' });
    sarahToken = sarahRes.body.token;

    // Login as Member (Timmy Miller)
    const timmyRes = await request(app)
      .post('/api/auth/login')
      .send({ userId: 'user-member-2' });
    timmyToken = timmyRes.body.token;
  });

  beforeEach(() => {
    db.resetToSeed();
  });

  describe('Constraint 1: Task state transitions through Pending -> In Progress -> Completed', () => {
    it('should reject direct transition from PENDING to COMPLETED', async () => {
      // Create a pending task
      const createRes = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Test Pending to Completed',
          description: 'Testing skip transition',
          dueDate: new Date(Date.now() + 86400000).toISOString(),
          priority: 'MEDIUM',
          assigneeId: 'user-member-1'
        });
      expect(createRes.status).toBe(201);
      const taskId = createRes.body.id;

      // Attempt to move straight to COMPLETED
      const patchRes = await request(app)
        .patch(`/api/tasks/${taskId}/status`)
        .set('Authorization', `Bearer ${sarahToken}`)
        .send({ status: 'COMPLETED' });

      expect(patchRes.status).toBe(400);
      expect(patchRes.body.error).toMatch(/cannot skip from Pending directly to Completed/i);
    });

    it('should allow valid transition from PENDING -> IN_PROGRESS -> COMPLETED', async () => {
      const createRes = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Valid Transition Task',
          description: 'Testing valid lifecycle',
          dueDate: new Date(Date.now() + 86400000).toISOString(),
          priority: 'HIGH',
          assigneeId: 'user-member-1'
        });
      const taskId = createRes.body.id;

      // Move PENDING -> IN_PROGRESS
      const step1 = await request(app)
        .patch(`/api/tasks/${taskId}/status`)
        .set('Authorization', `Bearer ${sarahToken}`)
        .send({ status: 'IN_PROGRESS' });
      expect(step1.status).toBe(200);
      expect(step1.body.status).toBe('IN_PROGRESS');

      // Move IN_PROGRESS -> COMPLETED
      const step2 = await request(app)
        .patch(`/api/tasks/${taskId}/status`)
        .set('Authorization', `Bearer ${sarahToken}`)
        .send({ status: 'COMPLETED' });
      expect(step2.status).toBe(200);
      expect(step2.body.status).toBe('COMPLETED');
    });
  });

  describe('Constraint 2: Only the assignee or an admin/lead may mark a task Completed', () => {
    it('should forbid a non-assignee member from marking task COMPLETED', async () => {
      // Create a task assigned to Sarah Chen
      const createRes = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Sarah Exclusive Task',
          description: 'Sarah only',
          dueDate: new Date(Date.now() + 86400000).toISOString(),
          priority: 'MEDIUM',
          assigneeId: 'user-member-1'
        });
      const taskId = createRes.body.id;

      // Sarah moves to IN_PROGRESS
      await request(app)
        .patch(`/api/tasks/${taskId}/status`)
        .set('Authorization', `Bearer ${sarahToken}`)
        .send({ status: 'IN_PROGRESS' });

      // Timmy (different member) tries to mark it COMPLETED
      const forbiddenRes = await request(app)
        .patch(`/api/tasks/${taskId}/status`)
        .set('Authorization', `Bearer ${timmyToken}`)
        .send({ status: 'COMPLETED' });

      expect(forbiddenRes.status).toBe(403);
      expect(forbiddenRes.body.error).toMatch(/Permission denied: Only the task assignee .* or an Admin\/Lead/i);

      // Admin (Alex Lead) CAN mark it COMPLETED
      const adminCompleteRes = await request(app)
        .patch(`/api/tasks/${taskId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'COMPLETED' });

      expect(adminCompleteRes.status).toBe(200);
      expect(adminCompleteRes.body.status).toBe('COMPLETED');
    });
  });

  afterAll(() => {
    // Clean up any lingering intervals
  });

  describe('Constraint 3: Max 5 simultaneously active tasks per user', () => {
    it('should reject 6th active task assignment to a member', async () => {
      // Create a user with 0 active tasks or check Sarah Chen (who starts with 1 active task: task-101)
      // Sarah currently has 1 active task.
      // Let's add 4 more active tasks to reach exactly 5 active tasks.
      for (let i = 1; i <= 4; i++) {
        const res = await request(app)
          .post('/api/tasks')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            title: `Sarah Active Task #${i}`,
            description: `Active task number ${i}`,
            dueDate: new Date(Date.now() + 86400000).toISOString(),
            priority: 'LOW',
            assigneeId: 'user-member-1'
          });
        expect(res.status).toBe(201);
      }

      // Sarah now has 1 + 4 = 5 active tasks.
      // Attempt 6th active task assignment to Sarah: MUST FAIL with 400
      const sixthRes = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Sarah 6th Task - Should Fail',
          description: 'Exceeding 5 active tasks limit',
          dueDate: new Date(Date.now() + 86400000).toISOString(),
          priority: 'URGENT',
          assigneeId: 'user-member-1'
        });

      expect(sixthRes.status).toBe(400);
      expect(sixthRes.body.error).toMatch(/already has 5 active tasks/i);
    });
  });

  describe('Constraint 6: Auditable history of at least the last 3 changes', () => {
    it('should record every change and return auditable history', async () => {
      const createRes = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Audit History Verification Task',
          description: 'Testing audit trail',
          dueDate: new Date(Date.now() + 86400000).toISOString(),
          priority: 'LOW',
          assigneeId: 'user-member-1'
        });
      const taskId = createRes.body.id;

      // Action 1: Reassign
      await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assigneeId: 'user-member-2' });

      // Action 2: Change status to IN_PROGRESS
      await request(app)
        .patch(`/api/tasks/${taskId}/status`)
        .set('Authorization', `Bearer ${timmyToken}`)
        .send({ status: 'IN_PROGRESS' });

      // Action 3: Change status to COMPLETED
      await request(app)
        .patch(`/api/tasks/${taskId}/status`)
        .set('Authorization', `Bearer ${timmyToken}`)
        .send({ status: 'COMPLETED' });

      // Fetch audit logs for the task
      const auditRes = await request(app).get(`/api/tasks/${taskId}/audit`);
      expect(auditRes.status).toBe(200);
      expect(auditRes.body.length).toBeGreaterThanOrEqual(3);

      const actions = auditRes.body.map((a: any) => a.action);
      expect(actions).toContain('CREATED');
      expect(actions).toContain('REASSIGNED');
      expect(actions).toContain('STATUS_CHANGE');
    });
  });

  describe('System Stats & Stretch Goals', () => {
    it('should return system metrics and queue stats', async () => {
      const statsRes = await request(app).get('/api/system/stats');
      expect(statsRes.status).toBe(200);
      expect(statsRes.body.stats).toBeDefined();
      expect(statsRes.body.stats.totalTasks).toBeGreaterThan(0);

      const queueRes = await request(app).get('/api/system/queue');
      expect(queueRes.status).toBe(200);
      expect(queueRes.body.summary).toBeDefined();
    });
  });
});
