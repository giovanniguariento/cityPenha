import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LoginEmailPage } from './login-email.page';

describe('LoginEmailPage', () => {
  let component: LoginEmailPage;
  let fixture: ComponentFixture<LoginEmailPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginEmailPage],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginEmailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
