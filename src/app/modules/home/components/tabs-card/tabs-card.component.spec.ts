import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TabsCardComponent } from './tabs-card.component';

describe('TabsCardComponent', () => {
  let component: TabsCardComponent;
  let fixture: ComponentFixture<TabsCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TabsCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TabsCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
