import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { AdminWordpressAccessItem } from '../../../../shared/interface/admin.interface';
import { FeedbackService } from '../../../../shared/services/feedback.service';
import { AdminService } from '../../services/admin.service';
import { AdminWordpressAccessPage } from './wordpress-access.page';

const mockItem = (overrides: Partial<AdminWordpressAccessItem> = {}): AdminWordpressAccessItem => ({
  userId: 'user-1',
  email: 'a@test.com',
  name: 'Alice',
  createdAt: '2026-06-19T14:30:00.000Z',
  wordpressId: 1,
  wordpressUsername: 'alice',
  wordpressPassword: 'secret',
  wordpressLoginUrl: 'https://citypenha.com/wp-login.php',
  credentialsStatus: 'ready',
  ...overrides,
});

describe('AdminWordpressAccessPage', () => {
  let component: AdminWordpressAccessPage;
  let fixture: ComponentFixture<AdminWordpressAccessPage>;
  let admin: jasmine.SpyObj<AdminService>;
  let feedback: jasmine.SpyObj<FeedbackService>;

  beforeEach(async () => {
    admin = jasmine.createSpyObj('AdminService', [
      'listWordpressAccess',
      'provisionWordpressAccess',
    ]);
    feedback = jasmine.createSpyObj('FeedbackService', ['showSuccess', 'showError']);

    admin.listWordpressAccess.and.returnValue(
      of({
        data: [mockItem()],
        meta: { nextCursor: 'cursor-1', count: 1 },
      })
    );

    await TestBed.configureTestingModule({
      imports: [AdminWordpressAccessPage],
      providers: [
        { provide: AdminService, useValue: admin },
        { provide: FeedbackService, useValue: feedback },
        {
          provide: MatDialog,
          useValue: { open: () => ({ afterClosed: () => of(false) }) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminWordpressAccessPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load initial list', () => {
    expect(component).toBeTruthy();
    expect(admin.listWordpressAccess).toHaveBeenCalled();
    expect(component.items().length).toBe(1);
    expect(component.nextCursor()).toBe('cursor-1');
  });

  it('loadMore appends next page', () => {
    admin.listWordpressAccess.and.returnValue(
      of({
        data: [mockItem({ userId: 'user-2', email: 'b@test.com', name: 'Bob' })],
        meta: { nextCursor: null, count: 1 },
      })
    );

    component.loadMore();

    expect(component.items().length).toBe(2);
    expect(component.nextCursor()).toBeNull();
  });

  it('runProvision updates item on success', fakeAsync(() => {
    const updated = mockItem({
      credentialsStatus: 'ready',
      wordpressPassword: 'new-secret',
    });
    admin.provisionWordpressAccess.and.returnValue(of(updated));

    component['runProvision']('user-1');
    tick();

    expect(component.items()[0].wordpressPassword).toBe('new-secret');
    expect(feedback.showSuccess).toHaveBeenCalled();
  }));

  it('runProvision shows error toast on failure', fakeAsync(() => {
    admin.provisionWordpressAccess.and.returnValue(
      throwError(() => ({ status: 500, message: 'fail' }))
    );

    component['runProvision']('user-1');
    tick();

    expect(feedback.showError).toHaveBeenCalled();
    expect(component.provisioningUserId()).toBeNull();
  }));
});
