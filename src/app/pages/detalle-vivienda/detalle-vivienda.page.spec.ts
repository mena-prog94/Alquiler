import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DetalleViviendaPage } from './detalle-vivienda.page';

describe('DetalleViviendaPage', () => {
  let component: DetalleViviendaPage;
  let fixture: ComponentFixture<DetalleViviendaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DetalleViviendaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
