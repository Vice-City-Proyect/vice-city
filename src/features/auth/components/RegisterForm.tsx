"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";

export default function RegisterForm() {
  // --- Estados del Formulario ---
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // --- Estado de validación y UI ---
  const [errors, setErrors] = useState<{ 
    name?: string; 
    email?: string; 
    password?: string; 
    confirmPassword?: string; 
    submit?: string;
  }>({});
  const [status, setStatus] = useState<"initial" | "loading" | "success" | "error">("initial");

  /**
   * Valida el formato del correo mediante Expresión Regular
   */
  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  /**
   * Ejecuta validaciones del cliente antes de enviar al backend.
   */
  const handleValidation = () => {
    const newErrors: typeof errors = {};
    let isValid = true;

    // Validación de Nombre Completo
    if (!name.trim()) {
      newErrors.name = "El nombre completo es requerido";
      isValid = false;
    }

    // Validación de Correo
    if (!email) {
      newErrors.email = "El correo electrónico es requerido";
      isValid = false;
    } else if (!validateEmail(email)) {
      newErrors.email = "Ingresa un correo electrónico válido";
      isValid = false;
    }

    // Validación de Contraseña (mínimo 6 caracteres)
    if (!password) {
      newErrors.password = "La contraseña es requerida";
      isValid = false;
    } else if (password.length < 6) {
      newErrors.password = "La contraseña debe tener al menos 6 caracteres";
      isValid = false;
    }

    // Validación de Confirmación (deben coincidir)
    if (!confirmPassword) {
      newErrors.confirmPassword = "Confirma tu contraseña";
      isValid = false;
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Las contraseñas no coinciden";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  /**
   * Manejador del evento Submit. Simula petición asíncrona.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("initial");
    
    if (!handleValidation()) return;

    setStatus("loading");
    setErrors({});

    // Mock API call
    try {
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          // Simulamos error aleatorio
          if (Math.random() > 0.8) {
            reject(new Error("El correo ya se encuentra registrado. Inicia sesión en su lugar."));
          } else {
            resolve(true);
          }
        }, 1500);
      });

      setStatus("success");
    } catch (err: any) {
      setStatus("error");
      setErrors({ submit: err.message || "Ocurrió un error durante el registro" });
    }
  };

  // --- Vista Exitoso (Success State) ---
  if (status === "success") {
    return (
      <div
        className="w-full max-w-md p-8 rounded-3xl bg-club-surface text-center flex flex-col items-center justify-center space-y-4"
        style={{
          border: "1.5px solid #b0bf3f",
          boxShadow: "0 8px 40px rgba(176, 191, 63, 0.13), 0 2px 12px rgba(0,0,0,0.07)",
        }}
      >
        <div className="w-16 h-16 bg-[#b0bf3f]/20 rounded-full flex items-center justify-center text-club-accent mb-2">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-club-accent">¡Registro Exitoso!</h2>
        <p className="text-text-muted text-sm">Bienvenido a la comunidad Vice City Sports.</p>
        <Link 
          href="/login"
          className="mt-4 px-6 py-2.5 bg-club-primary text-btn-text rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-club-primary-hover transition-colors"
        >
          Iniciar Sesión
        </Link>
      </div>
    );
  }

  // --- Vista Principal (Formulario de Registro) ---
  return (
    <div
      className="w-full max-w-md p-8 rounded-3xl bg-club-surface"
      style={{
        border: "1.5px solid #b0bf3f",
        boxShadow: "0 8px 40px rgba(176, 191, 63, 0.13), 0 2px 12px rgba(0,0,0,0.07)",
      }}
    >
      {/* Cabecera */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-club-accent tracking-tight">
          Crear Cuenta
        </h1>
        <p className="text-sm italic text-text-muted mt-2 font-serif">
          Únete a Vice City Sports hoy
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Mensaje de error general de la API */}
        {errors.submit && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm text-center">
            {errors.submit}
          </div>
        )}

        {/* Campo: Nombre Completo */}
        <FormField htmlFor="name" label="Nombre Completo" error={errors.name}>
          <Input
            id="name"
            type="text"
            placeholder="Lucia Caminos"
            value={name}
            error={!!errors.name}
            disabled={status === "loading"}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
            }}
          />
        </FormField>

        {/* Campo: Correo Electrónico */}
        <FormField htmlFor="email" label="Correo Electrónico" error={errors.email}>
          <Input
            id="email"
            type="email"
            placeholder="usuario@vicecity.club"
            value={email}
            error={!!errors.email}
            disabled={status === "loading"}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
            }}
          />
        </FormField>

        {/* Campo: Contraseña */}
        <FormField htmlFor="password" label="Contraseña" error={errors.password}>
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={password}
            error={!!errors.password}
            disabled={status === "loading"}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
            }}
          />
        </FormField>

        {/* Campo: Confirmar Contraseña */}
        <FormField htmlFor="confirmPassword" label="Confirmar Contraseña" error={errors.confirmPassword}>
          <Input
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={confirmPassword}
            error={!!errors.confirmPassword}
            disabled={status === "loading"}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
            }}
          />
        </FormField>

        {/* Toggle: Mostrar contraseña */}
        <div className="flex items-center gap-2">
          <input
            id="show-password"
            type="checkbox"
            checked={showPassword}
            onChange={(e) => setShowPassword(e.target.checked)}
            className="w-4 h-4 rounded border-[#b0bf3f] accent-[#b0bf3f] cursor-pointer"
          />
          <label
            htmlFor="show-password"
            className="text-sm text-text-muted cursor-pointer select-none"
          >
            Mostrar contraseñas
          </label>
        </div>

        {/* Botón de Enviar */}
        <Button
          type="submit"
          className="w-full mt-2"
          disabled={status === "loading" || (!name && !email && !password && !confirmPassword)}
        >
          {status === "loading" ? "REGISTRANDO..." : "Registrarse"}
        </Button>

        {/* Enlace de Login */}
        <p className="mt-6 text-center text-xs text-text-muted">
          ¿Ya tienes una cuenta?{" "}
          <Link
            href="/login"
            className="font-bold text-club-accent hover:text-club-primary transition-colors underline underline-offset-2"
          >
            Inicia sesión aquí
          </Link>
        </p>
      </form>
    </div>
  );
}

