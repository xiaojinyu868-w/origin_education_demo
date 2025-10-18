import { act, render, waitFor } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { User } from "../types";

const {
  mockFetchCurrentUser,
  mockLoginUser,
  mockRegisterUser,
} = vi.hoisted(() => ({
  mockFetchCurrentUser: vi.fn<[], Promise<User>>(),
  mockLoginUser: vi.fn<
    [{ email: string; password: string }],
    Promise<{ access_token: string; token_type?: string }>
  >(),
  mockRegisterUser: vi.fn<
    [
      {
        email: string;
        password: string;
        name: string;
        create_demo_data?: boolean;
      },
    ],
    Promise<User>
  >(),
}));

vi.mock("antd", () => ({
  message: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
    destroy: vi.fn(),
  },
}));

vi.mock("../api/services", () => ({
  fetchCurrentUser: mockFetchCurrentUser,
  loginUser: mockLoginUser,
  registerUser: mockRegisterUser,
}));

import { AUTH_TOKEN_KEY } from "../constants/auth";
import useAuth from "../hooks/useAuth";
import { AuthProvider } from "./AuthContext";

interface CaptureContextProps {
  onUpdate: (value: ReturnType<typeof useAuth>) => void;
}

const CaptureContext: React.FC<CaptureContextProps> = ({ onUpdate }) => {
  const context = useAuth();
  onUpdate(context);
  const statusLabel = context.loading
    ? "loading"
    : context.user
      ? context.user.email
      : "guest";
  return <div data-testid="auth-state">{statusLabel}</div>;
};

const renderWithProvider = (onUpdate: CaptureContextProps["onUpdate"]) =>
  render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <AuthProvider>
        <CaptureContext onUpdate={onUpdate} />
      </AuthProvider>
    </MemoryRouter>,
  );

const stubUser = (overrides: Partial<User> = {}): User => ({
  id: 1,
  email: "mock-teacher@example.com",
  name: "Mock Teacher",
  is_demo: false,
  ...overrides,
});

describe("AuthContext", () => {
  let latestContext: ReturnType<typeof useAuth> | null = null;

  beforeEach(() => {
    latestContext = null;
    localStorage.clear();
    mockFetchCurrentUser.mockReset();
    mockLoginUser.mockReset();
    mockRegisterUser.mockReset();
  });

  it("hydrates existing session from storage", async () => {
    const user = stubUser();
    localStorage.setItem(AUTH_TOKEN_KEY, "stored-token");
    mockFetchCurrentUser.mockResolvedValue(user);

    renderWithProvider((value) => {
      latestContext = value;
    });

    await waitFor(() => {
      expect(latestContext?.loading).toBe(false);
    });
    expect(mockFetchCurrentUser).toHaveBeenCalledTimes(1);
    expect(latestContext?.user).toMatchObject({ email: user.email, name: user.name });
  });

  it("performs login, stores token, and refreshes profile", async () => {
    const user = stubUser({ email: "teacher-login@example.com", name: "Login User" });
    mockLoginUser.mockResolvedValueOnce({ access_token: "new-token", token_type: "bearer" });
    mockFetchCurrentUser.mockResolvedValue(user);

    renderWithProvider((value) => {
      latestContext = value;
    });

    await waitFor(() => expect(latestContext).not.toBeNull());
    expect(latestContext?.user).toBeNull();

    await act(async () => {
      await latestContext?.login(user.email, "StrongPass123!");
    });

    expect(mockLoginUser).toHaveBeenCalledWith({ email: user.email, password: "StrongPass123!" });
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe("new-token");
    await waitFor(() =>
      expect(latestContext?.user).toMatchObject({ email: user.email, name: user.name }),
    );
  });

  it("clears session on logout", async () => {
    const user = stubUser({ email: "teacher-logout@example.com" });
    localStorage.setItem(AUTH_TOKEN_KEY, "logout-token");
    mockFetchCurrentUser.mockResolvedValue(user);

    renderWithProvider((value) => {
      latestContext = value;
    });

    await waitFor(() => expect(latestContext?.user).not.toBeNull());
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe("logout-token");

    act(() => {
      latestContext?.logout();
    });

    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    await waitFor(() => expect(latestContext?.user).toBeNull());
  });
});
