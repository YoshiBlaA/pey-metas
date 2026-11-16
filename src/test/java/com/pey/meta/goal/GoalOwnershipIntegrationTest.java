package com.pey.meta.goal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.jayway.jsonpath.JsonPath;

/** Registro de cuentas y que cada admin vea y maneje solo sus metas (H2, de punta a punta). */
@SpringBootTest
@AutoConfigureMockMvc
class GoalOwnershipIntegrationTest {

    private static final String GOAL = "{\"title\":\"Meta de prueba\",\"targetAmount\":1000,\"presetAmounts\":[100]}";

    @Autowired
    private MockMvc mockMvc;

    private String register(String name, String email) throws Exception {
        String body = mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + name + "\",\"email\":\"" + email + "\",\"password\":\"clave-segura-1\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andReturn().getResponse().getContentAsString();
        return "Bearer " + JsonPath.read(body, "$.token");
    }

    private static String email() {
        return "u" + UUID.randomUUID().toString().substring(0, 8) + "@correo.com";
    }

    @Test
    void cadaAdminVeYManejaSoloSusMetas() throws Exception {
        String emailA = email();
        String a = register("Familia A", emailA.toUpperCase());
        String b = register("Familia B", email());

        mockMvc.perform(get("/api/admin/me").header(HttpHeaders.AUTHORIZATION, a))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value(emailA))
                .andExpect(jsonPath("$.name").value("Familia A"));

        String created = mockMvc.perform(post("/api/admin/goals").header(HttpHeaders.AUTHORIZATION, a)
                        .contentType(MediaType.APPLICATION_JSON).content(GOAL))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        Integer id = JsonPath.read(created, "$.id");

        mockMvc.perform(get("/api/admin/goals").header(HttpHeaders.AUTHORIZATION, a))
                .andExpect(jsonPath("$.length()").value(1));
        mockMvc.perform(get("/api/admin/goals").header(HttpHeaders.AUTHORIZATION, b))
                .andExpect(jsonPath("$.length()").value(0));
        mockMvc.perform(get("/api/admin/goals/" + id).header(HttpHeaders.AUTHORIZATION, b))
                .andExpect(status().isNotFound());
        mockMvc.perform(put("/api/admin/goals/" + id).header(HttpHeaders.AUTHORIZATION, b)
                        .contentType(MediaType.APPLICATION_JSON).content(GOAL))
                .andExpect(status().isNotFound());
        mockMvc.perform(post("/api/admin/goals/" + id + "/close").header(HttpHeaders.AUTHORIZATION, b))
                .andExpect(status().isNotFound());

        // El sitio publico sigue mostrando las metas de todos.
        mockMvc.perform(get("/api/public/goals/" + id)).andExpect(status().isOk());

        // Login con el correo en otras mayusculas.
        String login = mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + emailA.toUpperCase() + "\",\"password\":\"clave-segura-1\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat((String) JsonPath.read(login, "$.token")).isNotBlank();
    }

    @Test
    void registroValidaYNoRepiteCorreo() throws Exception {
        String e = email();
        register("Uno", e);
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Dos\",\"email\":\"" + e + "\",\"password\":\"clave-segura-2\"}"))
                .andExpect(status().isConflict());
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"\",\"email\":\"no-es-correo\",\"password\":\"corta\"}"))
                .andExpect(status().isBadRequest());
    }
}
