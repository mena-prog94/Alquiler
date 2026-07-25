import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DetalleReciboPage } from './detalle-recibo.page';

describe('DetalleReciboPage', () => {
  let component: DetalleReciboPage;
  let fixture: ComponentFixture<DetalleReciboPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DetalleReciboPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
