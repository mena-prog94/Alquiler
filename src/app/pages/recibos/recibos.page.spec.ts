import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RecibosPage } from './recibos.page';

describe('RecibosPage', () => {
  let component: RecibosPage;
  let fixture: ComponentFixture<RecibosPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(RecibosPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
