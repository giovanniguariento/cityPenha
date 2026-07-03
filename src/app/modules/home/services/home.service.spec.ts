import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HomeService } from './home.service';
import { environment } from '../../../../environments/environment';

describe('HomeService', () => {
  let service: HomeService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(HomeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('uploadAvatar posts FormData file to /user/me/avatar', () => {
    const file = new File(['x'], 'avatar.png', { type: 'image/png' });

    service.uploadAvatar(file).subscribe((res) => {
      expect(res.photoUrl).toBe('https://cdn.example/avatar.png');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/user/me/avatar`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeInstanceOf(FormData);
    expect((req.request.body as FormData).get('file')).toBe(file);
    req.flush({
      data: {
        id: 'u1',
        email: 'a@b.com',
        name: 'User',
        photoUrl: 'https://cdn.example/avatar.png',
      },
    });
  });

  it('markAnonymousView posts visitorId to /post/:id/view', () => {
    const postId = 42;
    const visitorId = '550e8400-e29b-41d4-a716-446655440000';

    service.markAnonymousView(postId, visitorId).subscribe((res) => {
      expect(res).toEqual({
        wordpressPostId: 42,
        viewsCount: 10,
        alreadyViewed: false,
      });
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/post/${postId}/view`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ visitorId });
    req.flush({
      data: {
        wordpressPostId: 42,
        viewsCount: 10,
        alreadyViewed: false,
      },
    });
  });
});
